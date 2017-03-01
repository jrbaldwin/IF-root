import Metric from '../models/Metric';
import MetricType from '../types/MetricType';
import {
  GraphQLObjectType as ObjectType,
  GraphQLList as ListType,
  GraphQLString as StringType,
  GraphQLNonNull as NonNull,
} from 'graphql';
import Conn from '../sequelize';
import {resolver, defaultArgs} from 'graphql-sequelize';

const MetricListType = new ListType(MetricType);

const metrics = {  
  type: MetricListType,
  args: defaultArgs(Metric),
  resolve: resolver(Metric)
}

export default metrics;

